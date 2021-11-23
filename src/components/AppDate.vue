<template>
   <span :title="formatDate">
        {{formatDateDiff}}
      </span>
</template>

<script>
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)
export default {
    props: {
        timestamp:{
            required:true,
            type: [Number, Object]
        }
    },
 methods: {
   
    formatDateDiff () {
      const dateTime = dayjs.unix(this.timestamp).format('MMMM DD, YYYY') +
      ' (over ' + dayjs.unix(this.timestamp).fromNow() +')'

      return dateTime
    },
    formatDate () {
      return dayjs.unix(this.timestamp).format('MMMM DD, YYYY')
    }
  }
}
</script>

<style>

</style>