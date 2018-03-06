<template>
    <div>
        <div class="row">
            <div class="col-md-3">
                <div v-if="categories">
                    <div class="panel panel-default">
                        <div class="panel-heading">Categories</div>
                        <div class="panel-body">
                            <ul class="nav nav-pills nav-stacked">
                                <router-link tag="li" :to="getCategoryUrl(category.id)" class="nav-item" exact v-for="category in categories" :key="category.id">
                                    <a class="nav-link">{{ category.name }}</a>
                                </router-link>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-9">
                <div v-if="bulls.data">
                    <div class="panel panel-default">
                        <div class="panel-heading clearfix">
                            <router-link :to="'/' + type + '/create'" class="btn btn-primary btn-sm pull-right">Add {{ capitalise(type) }} Bull</router-link>
                        </div>

                        <div class="panel-body">
                            <table class="table table-borderless m-b-none">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th></th>
                                    </tr>
                                </thead>

                                <tbody>
                                    <tr v-for="bull in bulls.data">
                                        <td style="vertical-align: middle">
                                            {{ bull.prefix }} {{ bull.name }}
                                        </td>

                                        <td class="text-right">
                                            <div class="btn-group" role="group">
                                                <router-link :to="getBullEditUrl(bull.model, bull.id)" class="btn btn-default btn-sm">Edit</router-link>
                                                <button @click.prevent="deleteBull(bull)" class="btn btn-danger btn-sm">Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <nav aria-label="Page navigation" v-if="bulls.total > bulls.per_page">
                        <ul class="pagination">
                            <li v-if="bulls.current_page > 1">
                                <router-link :to="getPaginationUrl(bulls.current_page - 1)" aria-label="Previous">
                                    <span aria-hidden="true">&laquo;</span>
                                </router-link>
                            </li>
                            <li v-for="n in bulls.last_page">
                                <router-link :to="getPaginationUrl(n)">{{ n }}</router-link>
                            </li>
                            <li v-if="bulls.current_page < bulls.last_page">
                                <router-link :to="getPaginationUrl(bulls.current_page + 1)" aria-label="Next">
                                    <span aria-hidden="true">&raquo;</span>
                                </router-link>
                            </li>
                        </ul>
                    </nav>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
    export default {
        data() {
            return {
                categories: [],
                bulls: [],
                endpoint: this.type,
                category: this.$route.params.category || 1,
                page: this.$route.query.page || 1
            };
        },

        props: [ 'type' ],

        mounted() {
            this.prepareComponent();
        },

        watch: {
            type (to, from) {
                if (to !== from) {
                    this.endpoint = to;
                    this.prepareComponent();
                }
            },

            '$route' (to, from) {
                if (to !== from) {
                    this.category = to.params.category;
                    this.page = to.query.page;
                }
            },

            category (to, from) {
                if (to !== from) {
                    this.getBulls();
                }
            },

            page (to, from) {
                if (to !== from) {
                    this.getBulls();
                }
            }
        },

        methods: {
            prepareComponent() {
                this.getBulls();
            },

            getBulls() {
                var url = '/api/admin/' + this.endpoint;
                if (typeof this.category !== 'undefined') {
                    url = url + '/category/' + this.category;
                }

                if (typeof this.page !== 'undefined') {
                    url = url + '?page=' + this.page;
                }

                axios.get(url)
                     .then(response => {
                         this.categories = response.data.categories || this.categories;
                         this.bulls = response.data.bulls;
                     })
                     .catch(error => {
                         window.flash(error.message, 'error');
                     });
            },

            getBullUrl(model, id) {
                return `/${model}/${id}`;
            },

            getBullEditUrl(model, id) {
                return `/${model}/${id}/edit`;
            },

            deleteBull(bull) {
                if (confirm('Are you sure you want to delete ' + bull.prefix + ' ' + bull.name + '?')) {
                    axios.delete('/api/admin' + this.getBullUrl(bull.model, bull.id))
                         .then(response => {
                             window.flash(response.data.message, 'success');
                             this.bulls.data = this.bulls.data.filter(item => bull.id != item.id);
                         })
                         .catch(error => {
                             window.flash(error.message, 'error');
                         });
                }
            },

            getCategoryUrl(category) {
                return `/${this.endpoint}/category/${category}`;
            },

            getPaginationUrl(page) {
                return `${this.getCategoryUrl(this.category)}?page=${page}`;
            },

            capitalise(text) {
                return text[0].toUpperCase() + text.slice(1);
            }
        }
    }
</script>