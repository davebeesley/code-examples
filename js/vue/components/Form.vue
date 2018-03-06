<template>
    <form action="" method="POST" @submit.prevent="onSubmit" @keydown="form.errors.clear($event.target.name)">
        <div class="form-group" :class="{ 'has-error' : form.errors.has('breed_id') }" v-if="breeds">
            <label for="breed_id">Breed</label>
            <select class="form-control" id="breed_id" name="breed_id" v-model="form.breed_id">
                <option v-for="breed in breeds" :value="breed.id">{{ breed.name }}</option>
            </select>
            <span class="help-block" v-text="form.errors.get('breed_id')" v-if="form.errors.has('breed_id')"></span>
        </div>

        <div class="form-group" :class="{ 'has-error' : form.errors.has('category_id') }" v-if="categories">
            <label for="category_id">Category</label>
            <select class="form-control" id="category_id" name="category_id" v-model="form.category_id">
                <option v-for="category in categories" :value="category.id">{{ category.name }}</option>
            </select>
            <span class="help-block" v-text="form.errors.get('category_id')" v-if="form.errors.has('category_id')"></span>
        </div>
        
        <div class="form-group" :class="{ 'has-error' : form.errors.has('prefix') }">
            <label for="prefix">Prefix</label>
            <input type="text" class="form-control" id="prefix" name="prefix" v-model="form.prefix">
            <span class="help-block" v-text="form.errors.get('prefix')" v-if="form.errors.has('prefix')"></span>
        </div>
        
        <div class="form-group" :class="{ 'has-error' : form.errors.has('name') }">
            <label for="name">Name</label>
            <input type="text" class="form-control" id="name" name="name" v-model="form.name">
            <span class="help-block" v-text="form.errors.get('name')" v-if="form.errors.has('name')"></span>
        </div>

        <div class="checkbox">
            <label>
                <input type="checkbox" value="" id="visions" name="visions" v-model="form.visions">
                Visions?
            </label>
        </div>

        <button type="submit" class="btn btn-primary" :disabled="form.errors.any()" v-text="buttonText"></button>
    </form>
</template>

<script>
export default {
    data() {
        return {
            endpoint: this.type,
            getUrl: "",
            submitUrl: "",
            buttonText: "",
            form: new Form({
                category_id: null,
                breed_id: null,
                prefix: null,
                name: null,
                visions: false
            }),
            categories: [],
            breeds: [],
            bull: []
        };
    },

    props: ["method", "type", "id"],

    mounted() {
        this.prepareComponent();
    },

    methods: {
        prepareComponent() {
            this.setUrls();
            this.getFormData();
        },

        setUrls() {
            switch (this.method) {
                case "post":
                    this.getUrl = "/api/admin/" + this.endpoint + "/create";
                    this.submitUrl = "/api/admin/" + this.endpoint;
                    this.buttonText = "Create";
                    break;

                case "patch":
                case "put":
                    this.getUrl =
                        "/api/admin/" + this.endpoint + "/" + this.id + "/edit";
                    this.submitUrl =
                        "/api/admin/" + this.endpoint + "/" + this.id;
                    this.buttonText = "Update";
                    break;
            }
        },

        getFormData() {
            axios
                .get(this.getUrl)
                .then(response => {
                    this.categories = response.data.categories;
                    this.breeds = response.data.breeds;

                    if (response.data.bull) {
                        for (var key in response.data.bull) {
                            this.form[key] = response.data.bull[key];
                        }
                    }
                })
                .catch(error => {
                    this.categories = [];
                    this.breeds = [];
                });
        },

        onSubmit() {
            this.form
                .submit(this.method, this.submitUrl)
                .then(data => window.flash(data.message, "success"))
                .catch(errors =>
                    window.flash("There are errors with the form", "error")
                );
        }
    }
};
</script>